import React, { useEffect, useMemo, useState, useCallback } from "react"
import { createEditor, Editor, Text, Transforms } from "slate"
import { Slate, Editable, withReact } from "slate-react"
import tw from "@tailwindcssinjs/macro"
import { MapPin, Clock, ZapOff, ArrowRight, MoreHorizontal } from "react-feather"
import styled from "styled-components"
import { Bookmark, CheckCircle, Heart, Image as ImageIcon } from "react-feather"
import { gql, useLazyQuery, useMutation } from "@apollo/client"
import { useRouter } from "next/router"
import { useDispatch, useSelector } from "react-redux"
import { getDefaultValues } from "@apollo/client/utilities"
import Moment from "moment"

import Row from "../../../components/layouts/Row"
import RoundButton from "../../../components/atoms/RoundButton"
import SlateWrapper from "../../../components/SlateWrapper"
import { motion } from "framer-motion"
import BannerImage from "../../../components/compounds/BannerImage"
import ImageUpload from "../../../components/compounds/ImageUpload"
import EventStatusBar from "../../../components/molecules/EventStatusBar"
import RenderDates from "../../../components/molecules/RenderDates"
import DatesUpdateModal from "../../../components/compounds/DatesUpdateModal"
import { useAlert } from "react-alert"
import normalizeDates from "../../../libs/normalizeDates"
import validateDates from "../../../libs/validateDates"

const Wrapper = styled.div`
	${tw`w-full h-auto relative`};
`

const HeroSection = styled.section`
	${tw`relative bg-black-800 w-full`}
	height: ${700 * 0.75}px;
	button {
		opacity: 0;
	}
	&:hover {
		span {
			background: rgba(0, 0, 0, 0.4);
		}
		button {
			opacity: 1;
		}
	}
	span {
		${tw`absolute z-10 top-0 left-0 flex items-center justify-center h-full w-full transition-all`}
		background: rgba(0,0,0,0);
	}
`

const ContentLayout = styled.main`
	${tw`relative w-full bg-white relative z-10 md:px-4 lg:px-8`};
	border-radius: 2rem 2rem 0 0;
	margin-top: -2rem;
	box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
`
const Time = styled.p`
	${tw`text-xl uppercase text-black-500 font-light`};
`

const SectionHeading = styled.h2`
	${tw`
		font-primary 
		text-32  
		text-black-500
		tracking-tight 
		leading-none
		font-semibold
		mb-6 
		ml-px 
	`};
	&:first-letter {
		${tw`uppercase`}
	}
	&::after {
		content: "";
		position: relative;
		// display: block;
		height: 0.25rem;
		width: "100%";
		background: var(--bluishgray-500);
		margin-top: 0.5rem;
	}
`

const Section = styled.section`
	${tw`w-full py-8`};
`

const StyledImage = styled.img`
	${tw`absolute h-full w-full z-0 top-0 left-0 object-cover object-right`};
`

const Title = styled.h1`
	${tw`font-primary font-semibold tracking-tight text-black-600 -ml-1 md:-mt-2`}
	&:first-letter {
		${tw`uppercase`};
	}
	${p => {
		if (p.size > 15) {
			return tw`text-4xl md:text-52`
		} else {
			return tw`text-5xl md:text-52`
		}
	}}
	line-height: 1;
`

const Page = () => {
	/**
	 * Data flow
	 *
	 * 1. on Load, we fetch the event's data using the ID.
	 * 2. After fetch is successful, we'll dispatch the event's data to selectedEvent state in redux store.
	 * 3. This selectedEvent will serve as the master copy of the event (new changes will be compared to the master copy)
	 * 4. All the editable regions, i.e., title, images, description, and dates will have local states.
	 * 5. These local states will be initialized using the selectedEvent store's data.
	 * 6. Upon updating any of the title, images, descriptions, we trigger and isUpdated event.
	 * 7. If update is confirmed, we dispatch the updated the object to selected event.
	 *
	 */

	// Initializers
	const editor = useMemo(() => withReact(createEditor()), [])
	const router = useRouter()
	const alert = useAlert()
	const { id } = router.query //Gets event id from url query path
	const dispatch = useDispatch()

	const selectedEvent = useSelector(state => state.selectedEvent)

	//Constructing title into Slate Text Format
	const initialTitle = [
		{
			type: "paragraph",
			children: [{ text: "Heading" }],
		},
	]
	const initialDescription = [
		{
			type: "paragraph",
			children: [{ text: "Click here to add description" }],
		},
	]

	const user = useSelector(state => state.selectedEvent.user.name)
	const isOnline = useSelector(state => state.selectedEvent.isOnline)
	const venue = useSelector(state => state.selectedEvent.venue)
	// Editable data has local states.
	const [title, setTitle] = useState(initialTitle)
	const [description, setDescription] = useState(initialDescription)

	const [images, setImages] = useState("")
	const [bannerImageUrl, setBannerImageUrl] = useState(selectedEvent.images[0].url)
	const [occurrences, setOccurrences] = useState([])
	const [isDifferentTimes, setIsDifferentTimes] = useState(false)
	const [startDateTime, setStartDateTime] = useState(Moment())
	const [endDateTime, setEndDateTime] = useState(Moment())

	// UI Trigger states
	const [updated, setIsUpdated] = useState(false)
	const [imageUploadModal, showImageUploadModal] = useState(false)
	const [showDatesModal, setShowDatesModal] = useState(false)

	const renderElement = useCallback(props => {
		return <Title {...props.attributes}>{props.children}</Title>
	})

	useEffect(() => {
		/**
		 * Onload of the page component, fetches events details
		 * using Id.
		 */
		getEventDetails({
			variables: {
				id,
			},
		})
	}, [])

	const [getEventDetails] = useLazyQuery(GET_EVENT_DETAILS, {
		fetchPolicy: "no-cache",

		onCompleted(data) {
			console.log(data)
			debugger
			if (data.event) {
				let {
					id,
					title,
					isLive,
					isOnline,
					description,
					occurrences,
					venue,
					user,
					images,
				} = data.event

				if (description) {
					setDescription(JSON.parse(description))
				}

				// Normalizing is important for keeping data consistent and error free.
				let sortedDates = normalizeDates(occurrences)
				debugger
				setOccurrences(sortedDates)

				if (title) {
					// let tempTitle = title
					// title = [{ type: "h1", children: [{ text: tempTitle }] }]
					setTitle([
						{
							type: "heading",
							children: [{ text: title }],
						},
					])
				}
				dispatch({
					type: "UPDATE_SELECTED_EVENT",
					data: {
						id,
						title,
						isLive,
						isOnline,
						description,
						occurrences,
						user,
						images,
						venue,
					},
				})

				// Temp Fix
				// setTitle(data.event.title)
			}
		},

		onError(err) {
			console.log(err)
		},
	})

	const [updateEvent] = useMutation(UPDATE_EVENT, {
		onCompleted(data) {
			console.log(data)
			console.log("data is here")
			if (data.updateEvent.event) {
				const {
					id,
					title,
					description,
					images,
					occurrences,
					isLive,
				} = data.updateEvent.event
				let newTitle = [
					{
						type: "paragraph",
						children: [{ text: "" }],
					},
				]
				newTitle[0].children[0].text = title
				setTitle(newTitle)
				if (description) {
					setDescription(JSON.parse(description))
				}
				setImages(images)
				if (images.length > 0) setBannerImageUrl(images[0].url)
				alert.success("Event updated successfully")
				setOccurrences(occurrences)
				// setModalDates(occurrences)
				if (showDatesModal) setShowDatesModal(false)
				setIsUpdated(false) //closes the confirm update button
				dispatch({
					type: "UPDATE_SELECTED_EVENT",
					data: {
						id,
						title,
						description,
						images,
						isLive,
					},
				})
				//This sets callEventsApi key in redux store to true;
				dispatch({
					type: "CALL_EVENTS_API",
				})
			}
		},

		onError(error) {
			alert.error("Sorry! an error occurred at the server")
			console.log(error)
		},
	})

	//To update event details
	const handleUpdateEvent = () => {
		let sortedDates = normalizeDates(occurrences)

		let data = {
			id: selectedEvent.id,
			title: title[0].children[0].text, //Sending only string to the backend
			description: JSON.stringify(description),
			occurrences: sortedDates,
			/**
			 * Added By Maaz on 8 Dec 2020
			 * Conditionally adding images in input only if it changed
			 * TODO: Add condition for multiple images in near future
			 */
			...(Array.isArray(images) &&
				images[0].hasOwnProperty("encodedData") && { images: images }),
		}

		console.log(data)
		updateEvent({
			variables: {
				data,
			},
		})
		//Hide the confirm update button
		setTimeout(() => {
			setIsUpdated(false)
		}, 2000)
	}

	//To discard changes
	const discardChanges = () => {
		// updatePageState(selectedEvent)
	}

	const handleDescriptionChange = val => {
		//Need to update this according to the design
		setDescription(val)
	}

	const handleImageUpload = data => {
		/**
		 * Only updating once user clicks update
		 * button instead of always uploading to S3
		 */
		setImages(data)
		setBannerImageUrl(data[0].encodedData)
		// setIsUpdated(true)
		showImageUploadModal(false)
	}

	const handleDatesUpdateClick = dates => {
		debugger

		/**
		 * Change page.js occurrences here
		 */

		const canProceed = validateDates(dates)

		if (!canProceed) {
			alert.error("Please check your start and end times")
			return
		}

		let sortedDates = normalizeDates(dates)

		setOccurrences(sortedDates)
		setShowDatesModal(false)
	}

	useEffect(() => {
		console.log(bannerImageUrl)
	}, [bannerImageUrl])

	// Initializing didMount as false
	const [didMount, setDidMount] = useState(false)

	// Setting didMount to true upon mounting
	useEffect(() => {
		setDidMount(true)
	}, [])

	// Initializing didMount as false
	const [loadCount, setLoadCount] = useState(0)

	useEffect(() => {
		debugger
		// if (didMount) setIsUpdated(true)
		setLoadCount(state => state + 1)
		if (loadCount > 1) setIsUpdated(true)
	}, [description, title, occurrences, images])

	return (
		<>
			<EventStatusBar
				updated={updated}
				handleGoLive={() => alert("Props handleGoLive triggered")}
				onConfirmUpdate={() => handleUpdateEvent()}
			/>
			<Wrapper>
				<HeroSection>
					<StyledImage
						src={bannerImageUrl}
						alt={`${title} | on https://www.eventsnow.com`}
					/>{" "}
					<span>
						<ChangeBannerButton onClick={() => showImageUploadModal(true)} />
					</span>
				</HeroSection>

				<ContentLayout>
					<Section>
						<Row css={tw`pt-4 items-start md:px-2 lg:px-12`}>
							<div css={tw`w-full md:w-2/3`}>
								<Slate
									editor={editor}
									value={title}
									onChange={newValue => setTitle(newValue)}>
									<Editable renderElement={renderElement} />
								</Slate>
							</div>

							<div
								css={tw`w-full md:w-1/3 flex flex-col md:items-end mt-6 md:mt-0`}>
								<RenderDates
									isDifferentTimes={isDifferentTimes}
									occurrences={occurrences}
									startDateTime={startDateTime}
									endDateTime={endDateTime}
									onClick={() => setShowDatesModal(true)}
								/>
								<div
									css={tw`flex items-center space-x-2 md:text-right mt-8 md:mt-4`}>
									<MapPin />
									<p>{isOnline ? "Online" : venue ? venue.name : ""}</p>
								</div>
							</div>
						</Row>
						<Row css={tw`mt-12 pb-12 md:px-2 lg:px-12`}>
							<div>
								<p
									css={tw`uppercase tracking-wide text-sm text-black-300`}>
									Organized By
								</p>
								<div css={tw`flex items-center -ml-1 mt-2`}>
									<div
										css={tw`w-12 h-12 rounded-full bg-gray-200 mr-2`}></div>
									<h3 css={tw`text-black-500 text-lg`}>
										{user !== null || user != "" ? user : "Not Added"}
									</h3>
								</div>
							</div>
							{/* <Button css={tw`-mr-2 mt-10 md:mt-4 md:w-1/3`}>
								Tickets
							</Button> */}
						</Row>

						<hr />
					</Section>

					<Section>
						<Row css={tw`md:px-2 lg:px-12`}>
							<SectionHeading>About this event</SectionHeading>
						</Row>
						<Row css={tw`md:px-1 lg:px-8`}>
							<SlateWrapper
								description={description}
								onChange={val => handleDescriptionChange(val)}
							/>
						</Row>
					</Section>
				</ContentLayout>
				<ImageUpload
					isActive={imageUploadModal}
					onClose={() => showImageUploadModal(false)}
					handleImageUpload={handleImageUpload}
				/>
				<DatesUpdateModal
					onClose={() => setShowDatesModal(false)}
					isActive={showDatesModal}
					occurrences={occurrences}
					handleUpdateClick={handleDatesUpdateClick}
				/>
			</Wrapper>
		</>
	)
}

export default Page

const GET_EVENT_DETAILS = gql`
	query($id: ID!) {
		event(id: $id) {
			id
			title
			description
			isOnline
			isLive
			images {
				url
			}
			user {
				name
			}
			venue {
				name
			}
			occurrences {
				startDate
				startTime
				endTime
			}
		}
	}
`

const UPDATE_EVENT = gql`
	mutation($data: UpdateEventInput!) {
		updateEvent(data: $data) {
			event {
				id
				title
				description
				isOnline
				isLive
				images {
					url
				}
				occurrences {
					startDate
					startTime
					endTime
				}
			}
		}
	}
`

const ChangeBannerButton = props => (
	// Temporary Button, needs to be changed @praneethpike
	<button
		{...props}
		css={tw`
			inline-flex
			items-center
			px-4
			py-2
			bg-black-800
			bg-opacity-30
			text-black-500
			space-x-2
			hover:text-white
			hover:cursor-pointer
			rounded-full
			text-lg
			shadow-lg
		`}>
		<ImageIcon /> &nbsp; Change Banner
	</button>
)
